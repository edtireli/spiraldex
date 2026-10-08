#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <CoreImage/CoreImage.h>
#import <CoreVideo/CoreVideo.h>
// Uses the system foreground segmentation model, with optional subject selection.
int fail(NSString *message) { fprintf(stderr,"%s\n",message.UTF8String); return 1; }
int main(int argc,const char *argv[]) { @autoreleasepool {
 if(argc<3)return fail(@"Input and output paths are required.");
 NSURL *input=[NSURL fileURLWithPath:@(argv[1])], *output=[NSURL fileURLWithPath:@(argv[2])];
 VNImageRequestHandler *handler=[[VNImageRequestHandler alloc] initWithURL:input options:@{}];
 VNGenerateForegroundInstanceMaskRequest *request=[VNGenerateForegroundInstanceMaskRequest new]; NSError *error=nil;
 if(![handler performRequests:@[request] error:&error])return fail(error.localizedDescription);
 VNInstanceMaskObservation *result=request.results.firstObject;
 if(!result || !result.allInstances.count)return fail(@"No clear subject found. Try a simpler background.");
 NSIndexSet *selected=result.allInstances;
 if(argc>=5){
  CVPixelBufferRef mask=result.instanceMask; CVPixelBufferLockBaseAddress(mask,kCVPixelBufferLock_ReadOnly);
  size_t w=CVPixelBufferGetWidth(mask),h=CVPixelBufferGetHeight(mask),stride=CVPixelBufferGetBytesPerRow(mask);
  size_t x=MIN(w-1,MAX(0,atof(argv[3])*w)),y=MIN(h-1,MAX(0,atof(argv[4])*h));
  uint8_t *base=CVPixelBufferGetBaseAddress(mask);NSUInteger label=base[y*stride+x];
  CVPixelBufferUnlockBaseAddress(mask,kCVPixelBufferLock_ReadOnly);
  if(!label)return fail(@"That point is background. Tap inside the subject and retry.");
  selected=[NSIndexSet indexSetWithIndex:label];
 }else if(selected.count>1)return fail(@"Several subjects found. Tap the one you want and retry.");
 CVPixelBufferRef pixel=[result generateMaskedImageOfInstances:selected fromRequestHandler:handler croppedToInstancesExtent:YES error:&error];
 if(!pixel)return fail(error.localizedDescription);
 CIImage *image=[CIImage imageWithCVPixelBuffer:pixel];CIContext *context=[CIContext contextWithOptions:@{}];CGColorSpaceRef color=CGColorSpaceCreateDeviceRGB();
 BOOL ok=[context writePNGRepresentationOfImage:image toURL:output format:kCIFormatRGBA8 colorSpace:color options:@{} error:&error];
 CGColorSpaceRelease(color);CVPixelBufferRelease(pixel);
 if(!ok)return fail(error.localizedDescription);
 printf("{\"instances\":%lu,\"engine\":\"Apple Vision\"}\n",(unsigned long)selected.count);return 0;
}}
